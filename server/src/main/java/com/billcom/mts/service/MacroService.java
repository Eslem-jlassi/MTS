package com.billcom.mts.service;

import com.billcom.mts.dto.macro.MacroRequest;
import com.billcom.mts.dto.macro.MacroResponse;
import com.billcom.mts.entity.User;

import java.util.List;

/** CRUD et application de macros. */
public interface MacroService {

    List<MacroResponse> findAllForCurrentUser(User currentUser);

    MacroResponse findById(Long id, User currentUser);

    MacroResponse create(MacroRequest request, User currentUser);

    MacroResponse update(Long id, MacroRequest request, User currentUser);

    void delete(Long id, User currentUser);
}
